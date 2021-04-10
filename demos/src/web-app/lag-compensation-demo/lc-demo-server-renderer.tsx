import React from 'react';
import { LcDemoGameRendererComponent } from './lc-demo-game-renderer';
import { LcDemoGameServer } from '../../lag-compensation-demo/lc-demo-server';
import { RendererFrame } from '../common/renderer-frame.component';
import { LcDemoGameState } from '../../lag-compensation-demo/lc-demo-game-state';
import { lcDemoPlayerStatesAsParagraphTags } from './lc-demo-player-states-as-paragraph-tags';

interface ServerRendererProps {
  server: LcDemoGameServer;
  borderColor: string;
}

interface LcDemoServerRendererState {
  gameState: LcDemoGameState | undefined;
}

export class LcDemoServerRenderer extends React.Component<ServerRendererProps, LcDemoServerRendererState> {

  constructor(props: ServerRendererProps) {
    super(props);
    this.state = {
      gameState: undefined,
    };
    props.server.onUpdated((gameState) => {
      this.setState({ gameState });
    });
  }

  public render() {
    if (this.state.gameState == null) return null;
    return (
      <RendererFrame borderColor={this.props.borderColor} >
        <p>Server View</p>
        <LcDemoGameRendererComponent game={this.state.gameState} />
        {lcDemoPlayerStatesAsParagraphTags(this.state.gameState)}
      </RendererFrame>
    );
  }
}
