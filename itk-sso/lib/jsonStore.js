const fs = require('fs')
const path = require('path')

// Реестр клиентов и журнал токенов живут в JSON-файле: у itk-sso пока нет своей
// базы (каркас сервиса - задача #1945), а реестр OAuth-клиентов - десятки строк,
// которые правит руками платформенный инженер. Запись атомарная (temp + rename),
// чтобы параллельный перезапуск сервиса не прочитал обрезанный файл.
class JsonStore {
    constructor(file, initial) {
        this.file = file
        this.initial = initial || {}
        this.data = null
    }

    read() {
        if (this.data) return this.data
        try {
            this.data = JSON.parse(fs.readFileSync(this.file, 'utf-8'))
        } catch (e) {
            this.data = JSON.parse(JSON.stringify(this.initial))
        }
        for (let key of Object.keys(this.initial)) {
            if (this.data[key] === undefined) this.data[key] = JSON.parse(JSON.stringify(this.initial[key]))
        }
        return this.data
    }

    write(data) {
        this.data = data
        let dir = path.dirname(this.file)
        fs.mkdirSync(dir, {recursive: true})
        let tmp = this.file + '.' + process.pid + '.tmp'
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
        fs.renameSync(tmp, this.file)
        return data
    }

    update(fn) {
        let data = this.read()
        let result = fn(data)
        this.write(data)
        return result
    }
}

module.exports = JsonStore
