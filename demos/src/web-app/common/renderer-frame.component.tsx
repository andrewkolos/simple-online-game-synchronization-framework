import React from 'react';

interface RendererFrameProps {
  borderColor: string;
}

export class RendererFrame extends React.Component<RendererFrameProps> {

  constructor(props: RendererFrameProps) {
    super(props);

    this.state = {
      entities: [],
      numberOfPendingInputs: 0,
    };
  }

  public render() {
    const outerStyle = {
      border: `5px solid ${this.props.borderColor}`,
      padding: '15px',
      margin: '15px',
      display: 'inline-block',
      verticalAlign: 'top',
    };

    return (
      <div style={outerStyle}>
        {this.props.children}
      </div>
    );
  }
}
