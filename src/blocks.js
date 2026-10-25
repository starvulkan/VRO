import * as Blockly from 'blockly'

Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE = 'define'
Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE = 'my block'

const UNITS = [
  ['cm', 'cm'],
  ['inches', 'inches'],
  ['rotations', 'rotations'],
  ['degrees', 'degrees'],
  ['seconds', 'seconds'],
]

const DIRECTIONS = [
  ['forward', 'forward'],
  ['back', 'back'],
]

const MATH = ['abs', 'floor', 'ceiling', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'e^', '10^']
const PORTS = ['A', 'B', 'C', 'D', 'E', 'F']
const SPIN = [['clockwise', 'clockwise'], ['counterclockwise', 'counterclockwise']]
const MOTOR_UNITS = [['rotations', 'rotations'], ['degrees', 'degrees'], ['seconds', 'seconds']]
const WAYS = [['shortest path', 'shortest'], ['clockwise', 'clockwise'], ['counterclockwise', 'counterclockwise']]
const COLORS = ['red', 'green', 'blue', 'yellow', 'black', 'white', 'violet', 'azure']
const DISTANCE_UNITS = [['cm', 'cm'], ['inches', 'inches'], ['%', '%']]

const slot = (name) => ({ type: 'input_value', name })
const port = () => ({ type: 'field_dropdown', name: 'PORT', options: PORTS.map((p) => [p, p]) })
const condition = (name) => ({ type: 'input_value', name, check: 'Boolean' })
const mouth = (name) => ({ type: 'input_statement', name })
const dropdown = (name, options) => ({ type: 'field_dropdown', name, options })

function command(type, message, args, style) {
  return { type, message0: message, args0: args, previousStatement: null, nextStatement: null, style, inputsInline: true }
}

function reporter(type, message, args, style = 'vro_operators') {
  return { type, message0: message, args0: args, output: ['Number', 'String'], style, inputsInline: true }
}

function predicate(type, message, args, style = 'vro_operators') {
  return { type, message0: message, args0: args, output: 'Boolean', style, inputsInline: true }
}

Blockly.common.defineBlocksWithJsonArray([
    // the fields you type into!
  {
    type: 'vro_number',
    message0: '%1',
    args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
    output: ['Number', 'String'],
    style: 'vro_operators',
  },
  {
    type: 'vro_text',
    message0: '%1',
    args0: [{ type: 'field_input', name: 'TEXT', text: '' }],
    output: ['Number', 'String'],
    style: 'vro_operators',
  },

  // events 
  { type: 'vro_start', message0: 'when program starts', nextStatement: null, style: 'vro_events' },

  // movement 
  command('vro_move', 'move %1 for %2 %3', [dropdown('DIRECTION', DIRECTIONS), slot('AMOUNT'), dropdown('UNIT', UNITS)], 'vro_movement'),
  command('vro_move_steering', 'move steering %1 for %2 %3', [slot('STEERING'), slot('AMOUNT'), dropdown('UNIT', UNITS)], 'vro_movement'),
  command('vro_start_moving', 'start moving %1', [dropdown('DIRECTION', DIRECTIONS)], 'vro_movement'),
  command('vro_start_moving_steering', 'start moving steering %1', [slot('STEERING')], 'vro_movement'),
  command('vro_stop_moving', 'stop moving', [], 'vro_movement'),
  command('vro_set_speed', 'set movement speed to %1 %%', [slot('PERCENT')], 'vro_movement'),
  command('vro_set_rotation', 'set 1 motor rotation to %1 cm moved', [slot('CM')], 'vro_movement'),

  // control 
  command('vro_wait', 'wait %1 seconds', [slot('SECONDS')], 'vro_control'),
  command('vro_wait_until', 'wait until %1', [condition('COND')], 'vro_control'),
  {
    type: 'vro_repeat',
    message0: 'repeat %1',
    args0: [slot('TIMES')],
    message1: '%1',
    args1: [mouth('DO')],
    previousStatement: null,
    nextStatement: null,
    style: 'vro_control',
  },
  {
    type: 'vro_forever',
    message0: 'forever',
    message1: '%1',
    args1: [mouth('DO')],
    previousStatement: null,
    style: 'vro_control',
  },
  {
    type: 'vro_repeat_until',
    message0: 'repeat until %1',
    args0: [condition('COND')],
    message1: '%1',
    args1: [mouth('DO')],
    previousStatement: null,
    nextStatement: null,
    style: 'vro_control',
  },
  {
    type: 'vro_if',
    message0: 'if %1 then',
    args0: [condition('COND')],
    message1: '%1',
    args1: [mouth('DO')],
    previousStatement: null,
    nextStatement: null,
    style: 'vro_control',
  },
  {
    type: 'vro_if_else',
    message0: 'if %1 then',
    args0: [condition('COND')],
    message1: '%1',
    args1: [mouth('DO')],
    message2: 'else',
    message3: '%1',
    args3: [mouth('ELSE')],
    previousStatement: null,
    nextStatement: null,
    style: 'vro_control',
  },
  {
    type: 'vro_stop',
    message0: 'stop %1',
    args0: [dropdown('WHAT', [['all', 'all'], ['this stack', 'this'], ['exit block', 'exit']])],
    previousStatement: null,
    style: 'vro_control',
  },
  command('vro_stop_others', 'stop other stacks', [], 'vro_control'),

  // sensors 
  reporter('vro_timer', 'timer', [], 'vro_sensors'),
  command('vro_reset_timer', 'reset timer', [], 'vro_sensors'),

  // yaw angle
  reporter('vro_angle', '%1 angle', [dropdown('AXIS', [['yaw', 'yaw'], ['pitch', 'pitch'], ['roll', 'roll']])], 'vro_sensors'),
  command('vro_set_yaw', 'set yaw angle to %1', [slot('VALUE')], 'vro_sensors'),

  predicate('vro_is_color', '%1 is color %2 ?', [port(), dropdown('COLOR', [...COLORS.map((c) => [c, c]), ['no color', 'none']])], 'vro_sensors'),
  reporter('vro_color', '%1 color', [port()], 'vro_sensors'),
  predicate('vro_reflection_is', '%1 reflection %2 %3 %% ?', [port(), dropdown('CMP', [['<', '<'], ['>', '>'], ['=', '=']]), slot('A')], 'vro_sensors'),
  reporter('vro_reflection', '%1 reflected light', [port()], 'vro_sensors'),
  predicate('vro_is_pressed', '%1 is %2 ?', [port(), dropdown('STATE', [['pressed', 'pressed'], ['hard-pressed', 'hard'], ['released', 'released']])], 'vro_sensors'),
  reporter('vro_pressure', '%1 pressure in %2', [port(), dropdown('UNIT', [['%', '%'], ['newtons', 'newtons']])], 'vro_sensors'),
  predicate('vro_distance_is', '%1 is %2 %3 %4 ?', [port(), dropdown('CMP', [['closer than', 'closer'], ['farther than', 'farther'], ['exactly at', 'exactly']]), slot('A'), dropdown('UNIT', DISTANCE_UNITS)], 'vro_sensors'),
  reporter('vro_distance', '%1 distance in %2', [port(), dropdown('UNIT', DISTANCE_UNITS)], 'vro_sensors'),

  // motors
  command('vro_motor_run', 'run %1 %2 for %3 %4', [port(), dropdown('DIRECTION', SPIN), slot('AMOUNT'), dropdown('UNIT', MOTOR_UNITS)], 'vro_motors'),
  command('vro_motor_goto', '%1 go %2 to position %3', [port(), dropdown('WAY', WAYS), slot('POSITION')], 'vro_motors'),
  command('vro_motor_start', 'start motor %1 %2', [port(), dropdown('DIRECTION', SPIN)], 'vro_motors'),
  command('vro_motor_stop', 'stop motor %1', [port()], 'vro_motors'),
  command('vro_motor_set_speed', 'set %1 speed to %2 %%', [port(), slot('PERCENT')], 'vro_motors'),
  reporter('vro_motor_position', '%1 position', [port()], 'vro_motors'),
  reporter('vro_motor_relative', '%1 relative position', [port()], 'vro_motors'),
  command('vro_motor_set_relative', 'set %1 relative position to %2', [port(), slot('VALUE')], 'vro_motors'),
  reporter('vro_motor_speed', '%1 speed', [port()], 'vro_motors'),

  // operators
  reporter('vro_add', '%1 + %2', [slot('A'), slot('B')]),
  reporter('vro_sub', '%1 - %2', [slot('A'), slot('B')]),
  reporter('vro_mul', '%1 * %2', [slot('A'), slot('B')]),
  reporter('vro_div', '%1 / %2', [slot('A'), slot('B')]),
  reporter('vro_random', 'pick random %1 to %2', [slot('A'), slot('B')]),
  predicate('vro_gt', '%1 > %2', [slot('A'), slot('B')]),
  predicate('vro_lt', '%1 < %2', [slot('A'), slot('B')]),
  predicate('vro_eq', '%1 = %2', [slot('A'), slot('B')]),
  predicate('vro_and', '%1 and %2', [condition('A'), condition('B')]),
  predicate('vro_or', '%1 or %2', [condition('A'), condition('B')]),
  predicate('vro_not', 'not %1', [condition('A')]),
  predicate('vro_between', '%1 is between %2 and %3', [slot('A'), slot('B'), slot('C')]),
  reporter('vro_join', 'join %1 %2', [slot('A'), slot('B')]),
  reporter('vro_letter', 'letter %1 of %2', [slot('A'), slot('B')]),
  reporter('vro_length', 'length of %1', [slot('A')]),
  predicate('vro_contains', '%1 contains %2 ?', [slot('A'), slot('B')]),
  reporter('vro_mod', '%1 mod %2', [slot('A'), slot('B')]),
  reporter('vro_round', 'round %1', [slot('A')]),
  reporter('vro_math', '%1 of %2', [dropdown('FN', MATH.map((fn) => [fn, fn])), slot('A')]),
])

export const theme = Blockly.Theme.defineTheme('vro', {
  base: Blockly.Themes.Classic,
  blockStyles: {
    vro_events: { colourPrimary: '#FFBF00', colourSecondary: '#E6AC00', colourTertiary: '#CC9900', hat: 'cap' },
    vro_movement: { colourPrimary: '#FF4CCD', colourSecondary: '#E644B8', colourTertiary: '#CC3DA4' },
    vro_control: { colourPrimary: '#FFAB19', colourSecondary: '#EC9C13', colourTertiary: '#CF8B17' },
    vro_sensors: { colourPrimary: '#4CBFE6', colourSecondary: '#2E8EB8', colourTertiary: '#2E8EB8' },
    vro_operators: { colourPrimary: '#59C059', colourSecondary: '#46B946', colourTertiary: '#389438' },
    variable_blocks: { colourPrimary: '#FF8C1A', colourSecondary: '#FF8000', colourTertiary: '#DB6E00' },
    math_blocks: { colourPrimary: '#59C059', colourSecondary: '#46B946', colourTertiary: '#389438' },
    procedure_blocks: { colourPrimary: '#FF6680', colourSecondary: '#FF4D6A', colourTertiary: '#E64D66' },
    vro_motors: { colourPrimary: '#0090F5', colourSecondary: '#007ACC', colourTertiary: '#0066AA' },
  },
  categoryStyles: {
    vro_events: { colour: '#FFBF00' },
    vro_movement: { colour: '#FF4CCD' },
    vro_control: { colour: '#FFAB19' },
    vro_sensors: { colour: '#4CBFE6' },
    vro_operators: { colour: '#59C059' },
    vro_variables: { colour: '#FF8C1A' },
    vro_myblocks: { colour: '#FF6680' },
    vro_motors: { colour: '#0090F5' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#0B0910',
    toolboxBackgroundColour: '#18132A',
    toolboxForegroundColour: '#E8E4F2',
    flyoutBackgroundColour: '#18132A',
    flyoutForegroundColour: '#E8E4F2',
    flyoutOpacity: 1,
    scrollbarColour: '#2B2340',
    scrollbarOpacity: 1,
    insertionMarkerColour: '#FFFFFF',
    insertionMarkerOpacity: 0.3,
    cursorColour: '#A06BFF',
  },
  fontStyle: { family: 'system-ui, sans-serif', weight: '600', size: 12 },
})

// toolbox helpers!

const num = (value) => ({ shadow: { type: 'vro_number', fields: { NUM: value } } })
const txt = (value) => ({ shadow: { type: 'vro_text', fields: { TEXT: value } } })
const block = (type, inputs, fields) => ({ kind: 'block', type, ...(inputs && { inputs }), ...(fields && { fields }) })
const at = (port) => ({ PORT: port })

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Events',
      categorystyle: 'vro_events',
      contents: [block('vro_start')],
    },
    {
      kind: 'category',
      name: 'Motors',
      categorystyle: 'vro_motors',
      contents: [
        block('vro_motor_run', { AMOUNT: num(1) }, at('E')),
        block('vro_motor_goto', { POSITION: num(0) }, at('E')),
        block('vro_motor_start', null, at('E')),
        block('vro_motor_stop', null, at('E')),
        block('vro_motor_set_speed', { PERCENT: num(75) }, at('E')),
        block('vro_motor_position', null, at('E')),
        block('vro_motor_relative', null, at('E')),
        block('vro_motor_set_relative', { VALUE: num(0) }, at('E')),
        block('vro_motor_speed', null, at('E')),
      ],
    },
    {
      kind: 'category',
      name: 'Movement',
      categorystyle: 'vro_movement',
      contents: [
        block('vro_move', { AMOUNT: num(10) }),
        block('vro_move_steering', { STEERING: num(30), AMOUNT: num(10) }),
        block('vro_start_moving'),
        block('vro_start_moving_steering', { STEERING: num(30) }),
        block('vro_stop_moving'),
        block('vro_set_speed', { PERCENT: num(50) }),
        block('vro_set_rotation', { CM: num(17.59) }),
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      categorystyle: 'vro_control',
      contents: [
        block('vro_wait', { SECONDS: num(1) }),
        block('vro_repeat', { TIMES: num(10) }),
        block('vro_forever'),
        block('vro_if'),
        block('vro_if_else'),
        block('vro_wait_until'),
        block('vro_repeat_until'),
        block('vro_stop_others'),
        block('vro_stop'),
      ],
    },
    {
      kind: 'category',
      name: 'Sensors',
      categorystyle: 'vro_sensors',
      contents: [
        block('vro_angle'),
        block('vro_set_yaw', { VALUE: num(0) }),
        block('vro_timer'),
        block('vro_reset_timer'),
        block('vro_is_color', null, at('C')),
        block('vro_color', null, at('C')),
        block('vro_reflection_is', { A: num(50) }, at('C')),
        block('vro_reflection', null, at('C')),
        block('vro_distance_is', { A: num(15) }, at('D')),
        block('vro_distance', null, at('D')),
        block('vro_is_pressed', null, at('F')),
        block('vro_pressure', null, at('F')),
      ],
    },
    {
      kind: 'category',
      name: 'Operators',
      categorystyle: 'vro_operators',
      contents: [
        block('vro_random', { A: num(1), B: num(10) }),
        block('vro_add', { A: num(0), B: num(0) }),
        block('vro_sub', { A: num(0), B: num(0) }),
        block('vro_mul', { A: num(0), B: num(0) }),
        block('vro_div', { A: num(0), B: num(0) }),
        block('vro_gt', { A: num(0), B: num(50) }),
        block('vro_lt', { A: num(0), B: num(50) }),
        block('vro_eq', { A: num(0), B: num(50) }),
        block('vro_and'),
        block('vro_or'),
        block('vro_not'),
        block('vro_between', { A: num(5), B: num(0), C: num(10) }),
        block('vro_join', { A: txt('apple'), B: txt('banana') }),
        block('vro_letter', { A: num(1), B: txt('apple') }),
        block('vro_length', { A: txt('apple') }),
        block('vro_contains', { A: txt('apple'), B: txt('a') }),
        block('vro_mod', { A: num(0), B: num(0) }),
        block('vro_round', { A: num(0) }),
        block('vro_math', { A: num(0) }),
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'vro_variables',
      custom: 'VRO_VARIABLES',
    },
    {
      kind: 'category',
      name: 'My Blocks',
      categorystyle: 'vro_myblocks',
      custom: 'VRO_MYBLOCKS',
    },
  ],
}

export function variablesFlyout(workspace) {
  const variables = workspace
    .getVariableMap()
    .getVariablesOfType('')
    .sort((a, b) => a.getName().localeCompare(b.getName()))

  const contents = [{ kind: 'button', text: 'Make a Variable', callbackkey: 'CREATE_VARIABLE' }]
  if (variables.length === 0) return contents

  const first = { VAR: { id: variables[0].getId() } }
  contents.push(
    { kind: 'block', type: 'variables_set', fields: first, inputs: { VALUE: txt('0') } },
    { kind: 'block', type: 'math_change', fields: first, inputs: { DELTA: num(1) } },
  )

  for (const variable of variables) {
    contents.push({ kind: 'block', type: 'variables_get', fields: { VAR: { id: variable.getId() } } })
  }
  return contents
}

export function myBlocksFlyout(workspace) {
  const contents = [{ kind: 'block', type: 'procedures_defnoreturn', fields: { NAME: 'my block' } }]
  const [procedures] = Blockly.Procedures.allProcedures(workspace)

  for (const [name, params] of procedures) {
    const inputs = Object.fromEntries(params.map((_, i) => [`ARG${i}`, txt('')]))
    contents.push({ kind: 'block', type: 'procedures_callnoreturn', extraState: { name, params }, inputs, inline: true })
  }
  return contents
}

export const starter = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'vro_start',
        x: 40,
        y: 40,
        next: {
          block: {
            type: 'vro_set_speed',
            inputs: { PERCENT: num(60) },
            next: {
              block: {
                type: 'vro_repeat',
                inputs: {
                  TIMES: num(4),
                  DO: {
                    block: {
                      type: 'vro_move',
                      fields: { DIRECTION: 'forward', UNIT: 'cm' },
                      inputs: { AMOUNT: num(40) },
                      next: {
                        block: {
                          type: 'vro_move_steering',
                          fields: { UNIT: 'degrees' },
                          inputs: { STEERING: num(100), AMOUNT: num(193) },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
}