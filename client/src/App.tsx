import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Browse from './pages/Browse'
import Home from './pages/Home'
import ItemDetail from './pages/ItemDetail'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="items/:id" element={<ItemDetail />} />
      </Route>
    </Routes>
  )
}

export default App
