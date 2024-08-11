import { createRoot } from "react-dom/client";
import App from './App'
import './index.css'
import { sum } from './utils'

const name = '999'
sum(1, 2);
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App name={name} />);

// @ts-ignore
import.meta.hot.accept(() => {
  root.render(<App name={name} />);
});