import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Vite + React + Tailwind</h1>
      <button
        type="button"
        onClick={() => setCount((count) => count + 1)}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
      >
        Count is {count}
      </button>
    </div>
  )
}

export default App
