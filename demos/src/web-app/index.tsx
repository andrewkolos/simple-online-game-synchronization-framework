import * as React from 'react';
import ReactDom from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
} from 'react-router-dom';
import { BasicDemo } from './basic-demo/basic-demo.component';
import { LcDemo } from './lag-compensation-demo/lc-demo.component';

const App = () => (
  <Router>
    <div>
      <nav>
        <ul>
          <li>
            <Link to='/demo'>Basic Demo</Link>
          </li>
          <li>
            <Link to='/lagCompensationDemo'>Lag Compensation Demo</Link>
          </li>
        </ul>
      </nav>
      <Switch>
        <Route path='/demo'>
          <BasicDemo />
        </Route>
        <Route path='/lagCompensationDemo'>
          <LcDemo />
        </Route>
      </Switch>
    </div>
  </Router>
);

ReactDom.render(
  <App />,
  document.getElementById('app'),
);
