import React, { useEffect, useRef, useState } from 'react';
import { DemoGameRenderer } from './basic-demo-game-renderer';
import { BasicDemoPlayerState } from '../../basic-demo-implementation/player';
import { Entity } from '../../../../src';
import { createPositionParagraphTags } from './create-position-paragraph-tags';
import { DemoSyncServer } from '../../basic-demo-implementation/demo-server';
import { RendererFrame } from '../common/renderer-frame.component';
import { makeStyles, TextField } from '@material-ui/core';
import { Key } from 'ts-keycode-enum';

const useStyles = makeStyles({
  textField: {
    width: 125,
    marginBottom: 10
  }
});

interface ServerRendererProps {
  demoSyncServer: DemoSyncServer;
  borderColor: string;
  updateRateHz: number;
  onUpdateRateChanged: (value: number) => void;
}

export const ServerRenderer: React.FC<ServerRendererProps> = props => {
  const [entities, setEntities] = useState<ReadonlyArray<Entity<BasicDemoPlayerState>>>([]);
  const [updateRate, setUpdateRate] = useState(String(props.updateRateHz));
  const updateRateFieldRef = useRef<HTMLInputElement>();

  useEffect(() => {
    const handler = (e: ReadonlyArray<Entity<BasicDemoPlayerState>>) => setEntities(e);
    props.demoSyncServer.on('synchronized', handler);

    return () => {
      props.demoSyncServer.off('synchronized', handler);
    };
  }, []);

  const classes = useStyles();

  return (
    <RendererFrame borderColor={props.borderColor}>
      <p style={{ marginTop: 0 }}>Server View</p>
      <TextField
        className={classes.textField}
        value={updateRate}
        inputRef={updateRateFieldRef}
        type="number"
        variant="outlined"
        label="Update Rate (hz)"
        size="small"
        onChange={e => {
          setUpdateRate(e.target.value);
        }}
        onBlur={e => {
          props.onUpdateRateChanged(Number(e.target.value));
        }}
        onKeyDown={e => {
          if (e.which === Key.Enter || e.which === Key.Tab) {
            updateRateFieldRef.current?.blur();
          }
        }}
      />
      <DemoGameRenderer entities={entities} />
      <div className="demoText">{createPositionParagraphTags(entities)}</div>
    </RendererFrame>
  );
};
