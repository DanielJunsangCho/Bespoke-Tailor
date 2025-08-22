import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { HistoryPage } from '../components/HistoryPage';
import './history.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <HistoryPage />
  </Provider>
);