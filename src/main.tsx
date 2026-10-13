import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Workspace } from './ui/Workspace'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('缺少根节点')

createRoot(root).render(
  <StrictMode>
    <Workspace />
  </StrictMode>,
)
