import './style.css'
import { mountBuild } from './build.js'

const views = {
  home: document.querySelector('#home'),
  build: document.querySelector('#build'),
}

let current = null
let build = null

function routeFrom(hash) {
  const name = hash.replace(/^#\/?/, '')
  return name in views ? name : 'home'
}

async function go() {
  const next = routeFrom(window.location.hash)
  if (next === current) return

  if (current === 'build') build.leave()

  for (const [name, view] of Object.entries(views)) view.hidden = name !== next
  current = next

  if (next === 'build') {
    build ??= await mountBuild(views.build)
    build.enter()
  } else {
    document.title = 'VRO'
  }
}

window.addEventListener('hashchange', go)
go()