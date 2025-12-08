const express = require('express')
const app = express()
const fs = require('fs')
const port = 2900

app.use(express.static('./../admin/build'));


app.get('*', (req, res) => {
  res.set('content-type', 'text/html');
  let html = fs.readFileSync('./../admin/build/index.html', 'utf-8')
  res.send(html)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
