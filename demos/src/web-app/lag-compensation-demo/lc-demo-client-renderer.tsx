import React from 'react';
import { LcDemoClient } from '../../lag-compensation-demo/lc-demo-client';
import { LcDemoGameState } from '../../lag-compensation-demo/lc-demo-game-state';
import { RendererFrame } from '../common/renderer-frame.component';
import { LcDemoGameRendererComponent } from './lc-demo-game-renderer';
import { lcDemoPlayerStatesAsParagraphTags } from './lc-demo-player-states-as-paragraph-tags';

interface LcDemoClientRendererProps {
  title: JSX.Element;
  borderColor: string;
  client: LcDemoClient;
}

interface LcDemoClientRendererState {
  gameState: LcDemoGameState | undefined;
  numberOfPendingInputs: number | undefined;
}

export class LcDemoClientRenderer extends React.Component<LcDemoClientRendererProps, LcDemoClientRendererState> {

  constructor(props: LcDemoClientRendererProps) {
    super(props);

    this.state = {
      gameState: undefined,
      numberOfPendingInputs: undefined,
    };

    props.client.on('updated', ((gameState: LcDemoGameState) => {
      this.setState({
        gameState,
      });
    }));
  }

  public render() {
    const game = this.state.gameState;
    if (game == null) return null;
    return (
      <RendererFrame borderColor={this.props.borderColor} >
        {this.props.title}
        <LcDemoGameRendererComponent game={game} />
        {lcDemoPlayerStatesAsParagraphTags(game)}
      </RendererFrame>
    );
  }
}
