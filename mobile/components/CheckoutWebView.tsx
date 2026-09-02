import { useEffect, useRef } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

export interface CheckoutResult {
  type: 'success' | 'dismiss' | 'failed'
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
  error?: string
}

export interface CheckoutOptions {
  keyId: string
  amount: number
  currency: string
  orderId: string
  description: string
}

// The exact real Razorpay checkout.js flow the web app uses
// (client/src/lib/razorpay.ts), just loaded inside a page instead of the
// browser directly. Bridges back to React Native via
// window.ReactNativeWebView.postMessage — the standard react-native-webview
// pattern — falling back to window.parent.postMessage for the web build's
// iframe (react-native-webview has no web implementation at all, the same
// situation Phase 1 hit with expo-secure-store and Phase 5 with
// @react-native-community/datetimepicker; real devices never touch that
// branch, but it's what lets this app's own web output — and this
// project's Playwright-driven testing — actually exercise a real Razorpay
// test-mode payment too).
function buildCheckoutHtml(options: CheckoutOptions) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>body { margin: 0; background: #FAF9F5; font-family: -apple-system, sans-serif; }</style>
</head>
<body>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function sendResult(payload) {
      var msg = JSON.stringify(payload);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent) {
        window.parent.postMessage(msg, '*');
      }
    }
    var options = {
      key: ${JSON.stringify(options.keyId)},
      amount: ${JSON.stringify(options.amount)},
      currency: ${JSON.stringify(options.currency)},
      order_id: ${JSON.stringify(options.orderId)},
      name: 'Mudra House',
      description: ${JSON.stringify(options.description)},
      theme: { color: '#173B70' },
      handler: function (response) {
        sendResult({
          type: 'success',
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          sendResult({ type: 'dismiss' });
        },
      },
    };
    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        sendResult({ type: 'failed', error: response.error && response.error.description });
      });
      rzp.open();
    } catch (err) {
      sendResult({ type: 'failed', error: String(err) });
    }
  </script>
</body>
</html>`
}

export function CheckoutWebView({ options, onResult }: { options: CheckoutOptions; onResult: (result: CheckoutResult) => void }) {
  const html = buildCheckoutHtml(options)
  const resolvedRef = useRef(false)

  function handleResult(raw: string) {
    if (resolvedRef.current) return
    try {
      const parsed = JSON.parse(raw) as CheckoutResult
      if (parsed.type === 'success' || parsed.type === 'dismiss' || parsed.type === 'failed') {
        resolvedRef.current = true
        onResult(parsed)
      }
    } catch {
      // Ignore anything that isn't our own JSON payload.
    }
  }

  if (Platform.OS === 'web') {
    return <WebCheckoutFrame html={html} onMessage={handleResult} />
  }

  return (
    <WebView
      style={styles.fill}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(event) => handleResult(event.nativeEvent.data)}
      testID="checkout-webview"
    />
  )
}

function WebCheckoutFrame({ html, onMessage }: { html: string; onMessage: (raw: string) => void }) {
  useEffect(() => {
    function listener(event: MessageEvent) {
      if (typeof event.data === 'string') onMessage(event.data)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [onMessage])

  // react-native-web renders plain DOM elements fine in a web-only branch —
  // an <iframe> has no React Native equivalent, so this is the one place
  // that reaches past the RN component set on purpose.
  return (
    <iframe srcDoc={html} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} data-testid="checkout-webview" />
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
})
