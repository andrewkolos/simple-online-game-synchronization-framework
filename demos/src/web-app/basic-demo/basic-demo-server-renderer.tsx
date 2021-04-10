import React from 'react';
import { DemoGameRenderer } from './basic-demo-game-renderer';
import { BasicDemoPlayerState } from '../../basic-demo-implementation/player';
import { Entity } from '../../../../src';
import { createPositionParagraphTags } from './create-position-paragraph-tags';
import { DemoSyncServer } from '../../basic-demo-implementation/demo-server';
import { RendererFrame } from '../common/renderer-frame.component';

interface ServerRendererProps {
  demoSyncServer: DemoSyncServer;
  borderColor: string;
}

interface ServerRendererState {
  entities: ReadonlyArray<Entity<BasicDemoPlayerState>>;
}

export class ServerRenderer extends React.Component<ServerRendererProps, ServerRendererState> {

  constructor(props: ServerRendererProps) {
    super(props);

    this.state = {
      entities: [],
    };
    props.demoSyncServer.on('synchronized', (e => {
      this.setState({
        entities: e
      });
    }));
  }

  public render() {

    return (
      <RendererFrame borderColor={this.props.borderColor}>
        <p>Server View</p>
        <DemoGameRenderer entities={this.state.entities} />
        {createPositionParagraphTags(this.state.entities)}
      </RendererFrame>
    );
  }
}
