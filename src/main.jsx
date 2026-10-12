import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import {validateExpeditions} from './content/expeditions.js';
import './styles/tokens.css';
import './styles/app.css';

/* Content check: lists any problems in the browser console while developing. */
if(import.meta.env.DEV){
  const problems = validateExpeditions();
  if(problems.length) console.warn('Groundwork content check found ' + problems.length + ' problem(s):\n' + problems.join('\n'));
}

createRoot(document.getElementById('app')).render(<StrictMode><App/></StrictMode>);
