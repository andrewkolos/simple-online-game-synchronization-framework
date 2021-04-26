import { createMuiTheme, ThemeProvider } from '@material-ui/core';
import * as React from 'react';
import ReactDom from 'react-dom';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { BasicDemo } from './basic-demo/basic-demo.component';
import { LcDemo } from './lag-compensation-demo/lc-demo.component';

const theme = createMuiTheme({
  palette: {
    type: 'dark'
  }
});

const App = () => (
  <ThemeProvider theme={theme}>
    <Router>
      <div>
        <nav style={{ paddingTop: 4 }}>
          <ul>
            <li>
              <Link to="/">Basic Demo</Link>
            </li>
            <li>
              <Link to="/laserDemo">Laser Demo</Link>
            </li>
          </ul>
        </nav>
        <Switch>
          <Route path="/" exact>
            <BasicDemo />
          </Route>
          <Route path="/laserDemo" exact>
            <LcDemo />
          </Route>
        </Switch>
      </div>
    </Router>
  </ThemeProvider>
);

ReactDom.render(<App />, document.getElementById('app'));
