import { combineReducers } from 'redux';
import { of } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { mergeMap, map, catchError } from 'rxjs/operators';

import { combineEpics, ofType } from 'redux-observable';

const ENDPOINT = 'http://localhost:8081/api/eosio/';

const actionPrefix = `deployment/`;

const ABI_IMPORT = actionPrefix + `ABI_IMPORT`;
const CONTRACT_COMPILE = actionPrefix + `CONTRACT_COMPILE`;
const CONTRACT_DEPLOY = actionPrefix + `CONTRACT_DEPLOY`;
const FOLDER_SET = actionPrefix + `FOLDER_SET`;
const PROCESS_DONE = actionPrefix + `PROCESS_DONE`;
const PROCESS_FAIL = actionPrefix + `PROCESS_FAIL`;
const LOG_CLEAR = actionPrefix + `LOG_CLEAR`;

export const abiImport = fileContent => ({ type: ABI_IMPORT, fileContent });
export const contractCompile = fullPath => ({ type: CONTRACT_COMPILE, fullPath });
export const contractDeploy = ( fullPath, deployer ) => ({ type: CONTRACT_DEPLOY, fullPath, deployer });
export const folderSet = path => ({ type: FOLDER_SET, path });
export const logClear = () => ({ type: LOG_CLEAR });

export const processDone = payload => ({ type: PROCESS_DONE, payload });
export const processFail = ( payload, error ) => ({ type: PROCESS_FAIL, payload, error });

const importEpic = ( action$ ) => action$.pipe(
  ofType(ABI_IMPORT),
  mergeMap(action => {
    return ajax.post(ENDPOINT+"import", action.fileContent).pipe(
      map(res => {
        let { imported, abiPath, errors } = res.response; 
        return processDone({
          abiContents: action["fileContent"].content,
          imported: imported,
          abiPath: abiPath,
          errors: (errors.length > 0) ? errors.join("\n") : []
        })
      }),
      catchError(err => of(processFail(err, err.errors)))
    )
  })
);

const compileEpic = ( action$ ) => action$.pipe(
  ofType(CONTRACT_COMPILE),
  mergeMap(action => {
    return ajax.post(ENDPOINT+"compile", action.fullPath).pipe(
      map(res => {
        let { compiled, wasmLocation, abi, abiContents, stdout, stderr, errors } = res.response;
        return processDone({
          abiContents: abiContents,
          abiPath: abi,
          wasmPath: wasmLocation,
          stdoutLog: stdout,
          stderrLog: stderr,
          compiled: compiled,
          errors: errors,
          imported: false
        })
      }),
      catchError(err => of(processFail(err, err.errors)))
    )
  })
);

const deployEpic = ( action$ ) => action$.pipe(
  ofType(CONTRACT_DEPLOY),
  mergeMap(action => {
    return ajax.post(ENDPOINT+"deploy", {...action.fullPath, ...action.deployer}).pipe(
      map(res => {
        let { compiled, wasmLocation, abi, abiContents, stdout, stderr, errors, deployed, output } = res.response;
        let actualOutput;

        if (output) {
          let { processed } = output
          let { action_traces, ...intermediaryOutput } = processed;
          actualOutput = intermediaryOutput;
        }
        
        return processDone({
          abiContents: abiContents,
          abiPath: abi,
          wasmPath: wasmLocation,
          stdoutLog: stdout,
          stderrLog: stderr,
          compiled: compiled,
          deployed: deployed,
          imported: false,
          output: (actualOutput) ? actualOutput : null,
          errors: errors
        })
      }),
      catchError(err => of(processFail(err, err.errors)))
    )
  })
);

const consoleLogFormatting = ({ stdoutLog, stderrLog, errors }) => {
  
  if (stdoutLog && stdoutLog.length > 0) {
    console.log("=== Compiler Standard Out ===");
    stdoutLog.forEach(line => console.log(line));
  }
  
  if (stderrLog && stderrLog.length > 0) {
    console.log("=== Compiler Standard Error ===");
    stderrLog.forEach(line => console.log(line));
  }
  
  if (errors && errors.length > 0) {
    console.log("=== GUI/Tool Errors ===");
    errors.forEach(line => console.log(line));
  }

}

export const combinedEpic = combineEpics(
  importEpic,
  compileEpic,
  deployEpic
);

const dataInitState = {
  path: "",
  stdoutLog: [],
  stderrLog: [],
  wasmPath: "",
  abiPath: "",
  abiContents: "",
  output: null,
  compiled: false,
  imported: false,
  deployed: false,
  errors: []
}

const deploymentReducer = (state=dataInitState, action) => {
  switch (action.type) {
    case PROCESS_DONE: 
      consoleLogFormatting(action.payload);
      return {
        ...state,
        ...action.payload
      };
    case LOG_CLEAR:
      return {
        ...state,
        errors: [],
        stderrLog: [],
        stdoutLog: [],
        output: null
      }
    case PROCESS_FAIL:
      console.log(action);
      let { message } = action.payload
      return {
        ...state,
        errors: [
          message
        ]
      }
    case FOLDER_SET:
      return {
        ...state,
        path: action.path
      };
    default:
      return state;
  }
}

const isProcessingReducer = (state = false, action) => {
  switch (action.type) {
    case CONTRACT_COMPILE:
    case CONTRACT_DEPLOY:
    case ABI_IMPORT:
      return true;
    
    case PROCESS_DONE:
    case PROCESS_FAIL:
      return false;
    
    default:
      return state;
  }
}

export const combinedReducer = combineReducers({
  deployContainer: deploymentReducer,
  isProcessing: isProcessingReducer
})
