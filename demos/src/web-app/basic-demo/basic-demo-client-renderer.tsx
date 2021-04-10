import React from 'react';
import { DemoGameRenderer } from './basic-demo-game-renderer';
import { BasicDemoClientEntitySyncerRunner } from './basic-demo-client-runner';
import { BasicDemoPlayerState } from '../../basic-demo-implementation/player';
import { Entity } from '../../../../src';
import { createPositionParagraphTags } from './create-position-paragraph-tags';
import { RendererFrame } from '../common/renderer-frame.component';

interface ClientRendererProps {
  demoClientRunner: BasicDemoClientEntitySyncerRunner;
  borderColor: string;
  title: JSX.Element;
}

interface ClientRendererState {
  entities: Array<Entity<BasicDemoPlayerState>>;
  numberOfPendingInputs: number;
}

export class BasicDemoClientRenderer extends React.Component<ClientRendererProps, ClientRendererState> {

  constructor(props: ClientRendererProps) {
    super(props);

    this.state = {
      entities: [],
      numberOfPendingInputs: 0,
    };

    props.demoClientRunner.onSynchronized((entities: Array<Entity<BasicDemoPlayerState>>) => {
      this.setState({
        entities,
        numberOfPendingInputs: props.demoClientRunner.synchronizer.getNumberOfPendingInputs(),
      });
    });
  }

  public render() {

    return (
      <RendererFrame borderColor={this.props.borderColor}>
        {this.props.title}
        <DemoGameRenderer entities={this.state.entities} />
        {createPositionParagraphTags(this.state.entities)}
        <p>{`Non-acknowledged inputs: ${this.state.numberOfPendingInputs}`}</p>
      </RendererFrame>
    );
  }
}
