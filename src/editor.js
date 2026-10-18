import * as Blockly from 'blockly'
import { theme, toolbox, starter, variablesFlyout } from './blocks.js'

const SAVE_KEY = 'vro:workspace:v2'

function load(workspace) {
    let saved = null
    try {
        saved = JSON.parse(localStorage.getItem(SAVE_KEY))
    } catch (error) {
        saved = null
    }

    try {
        Blockly.serialization.workspaces.load(saved ?? starter, workspace)
    } catch (error) {
        console.warn('editor: saved program unreadable, loading starter', error)
        workspace.clear()
        Blockly.serialization.workspaces.load(starter, workspace)
    }
}

function save(workspace) {
    try {
        const state = Blockly.serialization.workspaces.save(workspace)
        localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch (error) {
        console.warn('editor: could not save program', error)
    }
}

const OPERATORS = {
    vro_add: 'add',
    vro_sub: 'sub',
    vro_mul: 'mul',
    vro_div: 'div',
    vro_mod: 'mod',
    vro_round: 'round',
    vro_random: 'random',
    vro_gt: 'gt',
    vro_lt: 'lt',
    vro_eq: 'eq',
    vro_and: 'and',
    vro_or: 'or',
    vro_not: 'not',
    vro_between: 'between',
    vro_join: 'join',
    vro_letter: 'letter',
    vro_length: 'length',
    vro_contains: 'contains',
}

function input(block, name) {
    return expression(block.getInputTargetBlock(name))
}

function expression(block) {
    if (!block) return null

    switch (block.type) {
        case 'vro_number':
        case 'math_number':
            return { r: 'n', v: Number(block.getFieldValue('NUM')) }
        case 'vro_text':
            return { r: 't', v: block.getFieldValue('TEXT') }
        case 'variables_get':
            return { r: 'var', name: block.getFieldValue('VAR') }
        case 'vro_timer':
            return { r: 'timer' }
        case 'vro_math':
            return { r: 'math', fn: block.getFieldValue('FN'), a: input(block, 'A') }
    }

    const r = OPERATORS[block.type]
    if (!r) return null
    return { r, a: input(block, 'A'), b: input(block, 'B'), c: input(block, 'C') }
}

function compileStack(block) {
  const steps = []
  while (block) {
    if (block.isEnabled()) {
      const step = compileBlock(block)
      if (step) steps.push(step)
    }
    block = block.getNextBlock()
  }
  return steps
}

function compileBlock(block) {
  const field = (name) => block.getFieldValue(name)
  const value = (name) => input(block, name)
  const body = (name) => compileStack(block.getInputTargetBlock(name))

  switch (block.type) {
    case 'vro_move':
      return { op: 'move', direction: field('DIRECTION'), amount: value('AMOUNT'), unit: field('UNIT') }
    case 'vro_move_steering':
      return { op: 'moveSteering', steering: value('STEERING'), amount: value('AMOUNT'), unit: field('UNIT') }
    case 'vro_start_moving':
      return { op: 'startMoving', direction: field('DIRECTION') }
    case 'vro_start_moving_steering':
      return { op: 'startMovingSteering', steering: value('STEERING') }
    case 'vro_stop_moving':
      return { op: 'stopMoving' }
    case 'vro_set_speed':
      return { op: 'setSpeed', percent: value('PERCENT') }
    case 'vro_set_rotation':
      return { op: 'setRotationDistance', cm: value('CM') }

    case 'vro_wait':
      return { op: 'wait', seconds: value('SECONDS') }
    case 'vro_wait_until':
      return { op: 'waitUntil', cond: value('COND') }
    case 'vro_repeat':
      return { op: 'repeat', times: value('TIMES'), body: body('DO') }
    case 'vro_forever':
      return { op: 'forever', body: body('DO') }
    case 'vro_repeat_until':
      return { op: 'repeatUntil', cond: value('COND'), body: body('DO') }
    case 'vro_if':
      return { op: 'if', cond: value('COND'), body: body('DO') }
    case 'vro_if_else':
      return { op: 'ifElse', cond: value('COND'), body: body('DO'), other: body('ELSE') }
    case 'vro_stop':
      return { op: 'stop', what: field('WHAT') }
    case 'vro_stop_others':
      return { op: 'stopOthers' }

    case 'vro_reset_timer':
      return { op: 'resetTimer' }

    case 'variables_set':
      return { op: 'set', name: field('VAR'), value: value('VALUE') }
    case 'math_change':
      return { op: 'change', name: field('VAR'), by: value('DELTA') }

    default:
      return null
  }
}

export function mountEditor(element) {
  const workspace = Blockly.inject(element, {
    toolbox,
    theme,
    renderer: 'zelos',
    media: './blockly-media/',
    trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 0.75 },
  })

  workspace.registerToolboxCategoryCallback('VRO_VARIABLES', variablesFlyout)
  workspace.registerButtonCallback('CREATE_VARIABLE', (button) => {
    Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace())
  })

  load(workspace)

  workspace.addChangeListener((event) => {
    if (!event.isUiEvent) save(workspace)
  })

  new ResizeObserver(() => Blockly.svgResize(workspace)).observe(element)

  return {
    program() {
      const stacks = workspace
        .getTopBlocks(true)
        .filter((block) => block.type === 'vro_start' && block.isEnabled())
        .map((block) => compileStack(block.getNextBlock()))

      return stacks.length > 0 ? { stacks } : null
    },

    state() {
        return Blockly.serialization.workspaces.save(workspace)
    },

    replace(state) {
        const previous = Blockly.serialization.workspaces.save(workspace)
        try {
            Blockly.serialization.workspaces.load(state, workspace)
        } catch (error) {
            workspace.clear()
            Blockly.serialization.workspaces.load(previous, workspace)
            throw new Error('This program has blocks this version of VRO does not know.')
        }
        workspace.clearUndo()
        save(workspace)
    },

    onChange(fn) {
        workspace.addChangeListener((event) => {
            if (!event.isUiEvent) fn()
        })
    },
  }
}