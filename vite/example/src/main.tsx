import { createRoot } from "react-dom/client";
import App from './App'
// import './index.css'
import { sum } from './utils'

sum(1, 2);
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);