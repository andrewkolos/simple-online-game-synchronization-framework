import React, { useEffect, useRef, useState } from 'react';
import { DemoGameRenderer } from './basic-demo-game-renderer';
import { BasicDemoClientEntitySyncerRunner } from './basic-demo-client-runner';
import { BasicDemoPlayerState } from '../../basic-demo-implementation/player';
import { Entity } from '../../../../src';
import { createPositionParagraphTags } from './create-position-paragraph-tags';
import { RendererFrame } from '../common/renderer-frame.component';
import { Checkbox, FormControl, FormControlLabel, makeStyles, TextField } from '@material-ui/core';
import { Disablers } from './disablers';
import { Key } from 'ts-keycode-enum';

const useStyles = makeStyles({
  controls: {
    '& *:not(:first-child)': {
      marginLeft: 5
    },
    marginBottom: 10
  },
  lagField: {
    maxWidth: 100
  },
  renderer: {},
  title: {
    fontSize: 'inherit',
    marginTop: 0
  }
});

interface ClientRendererProps {
  demoClientRunner: BasicDemoClientEntitySyncerRunner;
  borderColor: string;
  title: string;
  onLagValueChanged: (value: number) => void;
  onDisablersChanged: (value: Disablers) => void;
  disablers: Disablers;
  lag: number;
}

export const BasicDemoClientRenderer: React.FC<ClientRendererProps> = props => {
  const [entities, setEntities] = useState<Array<Entity<BasicDemoPlayerState>>>([]);
  const [numberOfPendingInputs, setNumberOfPendingInputs] = useState(0);
  const [lag, setLag] = useState(String(props.lag));
  const [disablers, setDisablers] = useState<Disablers>(props.disablers);
  const lagFieldRef = useRef<HTMLInputElement>();

  useEffect(() => {
    const handler = (entities: Array<Entity<BasicDemoPlayerState>>) => {
      setEntities(entities);
      setNumberOfPendingInputs(props.demoClientRunner.synchronizer.getNumberOfPendingInputs());
    };
    props.demoClientRunner.on('synchronized', handler);

    return () => {
      props.demoClientRunner.off('synchronized', handler);
    };
  }, []);

  const onLagValueChanged = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      setLag(value);
    }
  };

  const onLagFieldBlurred = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = e.target.value;
    const cleanedValue = value === '' ? '0' : value;
    setLag(cleanedValue);

    const asNumber = Number(cleanedValue);
    props.onLagValueChanged(asNumber);
  };

  const changeDisablers = (newValues: Partial<Disablers>) => {
    const updatedDisablers = {
      ...disablers,
      ...newValues
    };
    setDisablers(updatedDisablers);
    props.onDisablersChanged(updatedDisablers);
  };

  const classes = useStyles();
  return (
    <RendererFrame borderColor={props.borderColor}>
      <p className={classes.title}>{props.title}</p>
      <div className={classes.controls}>
        <FormControl>
          <TextField
            value={lag}
            label="Lag (ms)"
            className={classes.lagField}
            variant="outlined"
            onChange={onLagValueChanged}
            onBlur={onLagFieldBlurred}
            onKeyDown={(e) => {
              if (e.which === Key.Enter || e.which === Key.Tab) {
                lagFieldRef.current?.blur();
              }
            }}
            inputRef={lagFieldRef}
            size="small"
          />
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={!disablers.prediction}
              onChange={e => changeDisablers({ prediction: !e.target.checked })}
              color="primary"
            />
          }
          label="Prediction"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!disablers.reconciliation}
              onChange={e => changeDisablers({ reconciliation: !e.target.checked })}
              color="primary"
            />
          }
          label="Reconciliation"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!disablers.interpolation}
              onChange={e => changeDisablers({ interpolation: !e.target.checked })}
              color="primary"
            />
          }
          label="Interpolation"
        />
      </div>

      <DemoGameRenderer entities={entities} />
      <div className="demoText">
        {createPositionParagraphTags(entities)}
        <p>{`Inputs yet to be acknowledged by server: ${numberOfPendingInputs}`}</p>
      </div>
    </RendererFrame>
  );
};
