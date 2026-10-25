const FORMAT = 'vro'
const VERSION = 2
const EXTENSION = '.vro'

export const UNTITLED = 'untitled'

export const blank = {
    blocks: {
        languageVersion: 0,
        blocks: [{ type: 'vro_start', x: 40, y: 40 }],
    },
}

const PICKER = {
    types: [{ description: 'VRO program', accept: { 'application/json': [EXTENSION] } }],
}

const canPick = typeof window.showSaveFilePicker === 'function'

export function baseName(filename) {
    return filename.replace(/\.vro$/i, '')
}

export function pack({ workspace, robot }) {
    const file = { format: FORMAT, version: VERSION, saved: new Date().toISOString(), robot, workspace }
    return JSON.stringify(file, null, 2)
}

export function unpack(text) {
    let data = null
    try {
        data = JSON.parse(text)
    } catch (error) {
        data = null
    }

    if (!data || data.format !== FORMAT || typeof data.workspace !== 'object' || data.workspace === null) {
        throw new Error('This file is not a VRO program...')
    }
    if (data.version > VERSION) {
        throw new Error('This program was saved by a newer version of VRO.')
    }
    return { workspace: data.workspace, robot: data.robot ?? null }
}

function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveFile(project, { name, handle, as }) {
    const text = pack(project)

    if (canPick) {
        let target = as ? null : handle
        if (!target) {
            try {
                target = await window.showSaveFilePicker({ suggestedName: `${name}${EXTENSION}`, ...PICKER })
            } catch (error) {
                if (error.name === 'AbortError') return null
                throw error
            }
        }

        const writable = await target.createWritable()
        await writable.write(text)
        await writable.close()
        return { name: baseName(target.name), handle: target }
    }

    let filename = name
    if (as || name === UNTITLED) {
        const typed = window.prompt('Save program as', name)
        if (!typed || !typed.trim()) return null
        filename = baseName(typed.trim())
    }

    download(text, `${filename}${EXTENSION}`)
    return { name: filename, handle: null }
}

function pickWithInput() {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = EXTENSION
        input.addEventListener('change', () => resolve(input.files[0] ?? null))
        input.addEventListener('cancel', () => resolve(null))
        input.click()
    })
}

export async function openFile() {
    if (typeof window.showOpenFilePicker === 'function') {
        try {
            const [handle] = await window.showOpenFilePicker(PICKER)
            const file = await handle.getFile()
            return { name: baseName(file.name), handle, text: await file.text() }
        } catch (error) {
            if (error.name === 'AbortError') return null
            throw error
        }
    }

    const file = await pickWithInput()
    if (!file) return null
    return { name: baseName(file.name), handle: null, text: await file.text() }
}