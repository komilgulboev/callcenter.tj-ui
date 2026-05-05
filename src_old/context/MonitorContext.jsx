import React, { createContext, useContext, useReducer } from 'react'

const MonitorContext = createContext(null)

const initialState = {
  agents: {}, // { 110001: { state, lastUpdate } }
  queues: {},
}

function reducer(state, action) {
  switch (action.type) {
    case 'DEVICE_STATE': {
      const { endpoint, state: devState } = action.payload
      return {
        ...state,
        agents: {
          ...state.agents,
          [endpoint]: {
            state: devState,
            lastUpdate: Date.now(),
          },
        },
      }
    }

    default:
      return state
  }
}

export const MonitorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const handleEvent = (event) => {
    if (event.type === 'DeviceStateChange') {
      dispatch({
        type: 'DEVICE_STATE',
        payload: {
          endpoint: event.device.replace('PJSIP/', ''),
          state: event.state,
        },
      })
    }
  }

  return (
    <MonitorContext.Provider
      value={{
        agents: state.agents,
        queues: state.queues,
        handleEvent,
      }}
    >
      {children}
    </MonitorContext.Provider>
  )
}

export const useMonitor = () => useContext(MonitorContext)
