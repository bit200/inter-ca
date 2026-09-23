const fs = require('fs')
const os = require('os')
const path = require('path')

function tmpFile(name) {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'itk-sso-'))
    return path.join(dir, name)
}

module.exports = {tmpFile}
