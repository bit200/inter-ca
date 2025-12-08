const TYPES = {
    JS_SYNTAX: "JS_SYNTAX",
    REACT_SYNTAX: "JS_SYNTAX",
    TS_SYNTAX: "TS_SYNTAX",
    ALGORITHM: "ALGORITHM",
    HTML: "HTML",
    CSS: "CSS",
}


module.export = [
    {
        "description": "EXAMPLE",
        "initialCode": "EXAMPLE",
        "type": [TYPES.JS_SYNTAX]
    },
    {
        "description": "Отформатируйте дату \n на входе 10.05.2023 на выходе 05.10.2023",
        "initialCode": `const input = "10.06.2023;
    const dateFormat = (input) => {
    
    }
    
    console.log(dateFormat(input)) // 06.10.2023
    "`,
        "type": [TYPES.JS_SYNTAX]
    },
    {
        "description": "Есть массив чисел, надо убрать из него дубликаты",
        "initialCode": `const input = [1,1,1,1,11,2,2,2,2,22,2,2,22,2,3,3,33,3,3,3,3];
    const uniqItems = (input) => {
    
    }
    
    console.log(uniqItems(input)) // [1,11, 2,22, 3, 33]
    "`,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
    {
        "description": `Есть type Test1 
    Надо написать type Test2 = // Такой же как Test1 но без поля bar`,
        "initialCode": `type Test1 = {foo: string, bar: string}`,
        "type": [TYPES.TS_SYNTAX]
    },
    {
        "description": `Есть функция, внутри которой объявлен массив, и мы в этот массив пушим функции, 
    каждая из которых выводит i. Вопрос: что будет, когда мы вызовем функцию по 2 индексу?`,
        "initialCode": `f = () => {
      const res = [];
      let i = 0;
      while (i < 5){
        res.push(() => i);
        i++;
      }
      return res;
      
      console.log(f()[2]());
    }`,
        "type": [TYPES.JS_SYNTAX]
    },
    {
        "description": `В каком порядке отработает console.log  при монтировании`,
        "initialCode": `
          function A(){
                console.log("render1");
                const [x, setX] = useState(0);
            
                useEffect(() => {
                    console.log("e1" + x);
                    return () => console.log("e1r" + x)
                }, [x]);
            
                useEffect(() => {
                    console.log("e2" + x);
                    return () => console.log("e2r" + x)
                }, [])
            
                useEffect(() => {
                    console.log("e3" + x);
                    return () => console.log("e3r" + x)
                })
            
                const y = x  + 1;
            
                console.log("render2", y);
            }
    `,
        "type": [TYPES.REACT_SYNTAX]
    },
    {
        "description": `В какой последовательности выведутся консоль логи и почему`,
        "initialCode": `
      console.log(1);
      new Promise(resolve => {
        resolve();
        console.log(2);
      }).then(() => {
        console.log(3);
        setTimeout(() => {
          console.log(4);
        }, 0)
      })
      console.log(5);
      setTimeout(() => {
        console.log(6);
      }, 0);
    `,
        "type": [TYPES.JS_SYNTAX]
    },
    {
        "description": `Что будет в консоли`,
        "initialCode": `
      var obj = {test: 123}
      
      function func(x){
        x = 1;
        
        return x;
      }
      
      console.log(func(obj));
      console.log(obj)
    
    `,
        "type": [TYPES.JS_SYNTAX]
    },
    {
        "description": `Что будет в консоли`,
        "initialCode": `
      console.log(1);
      
      setTimout(() => console.log(2));
      
      Promise.resolve().then(() => console.log(3));
      Promise.resolve().then(() => setTimout(() => console.log(4)));
      Promise.resolve().then(() => console.log(5));
      
      setTimout(() => console.log(6));
      
      console.log(7);
    `,
        "type": [TYPES.JS_SYNTAX]
    },
    { // TODO add mock server url
        "description": `Рассадка человек  

Есть столы, большие маленькие, скругленные, и колонны, за каждым столом может сидеть один или более сотрудников, есть пустые столы, некоторые столы развернуты на 90 градусов. 

По массиву объектов надо отрисовать, столы, массив relations показывает за каким столом кто сидит.

Уже есть вывод всех столов, и все сотрудники из массива relations 

Надо пофиксить чтобы за нужным столом сидел нужный сотрудник. 

Задача делается итерационно, сначала на моках, потом берем данные с сервера, узнать какая будет сложность реализованного алгоритма 
`,
        "initialCode": `
      const objects = [{
id: 1,
type: ‘desk’,
left: 50,
top: 35,
angle: 0
}, 
{
id: 2,
type: ‘desk’,
left: 130,
top: 35,
angle: 0
}, 
{
id: 3,
type: ‘desk’,
left: 230,
top: 35,
angle: 0
}]


const users = [
{
id: 1,
name: ‘Ivan1’,
avatar: ‘fasfasd/asdf/asd.png’,
position: ‘Driver’
},
{
id: 2,
name: ‘Ivan2’,
avatar: ‘fasfasd/asdf/asd.png’,
position: CEO
}]


const relations = [{

user_id: 1,
object_id:1 
}, 

{

user_id: 2,
object_id:2 
},
{

user_id: 3,
object_id:3 
}
]

    `,
        "type": [TYPES.JS_SYNTAX]
    },

    {
        "description": `Сделать из массива объектов объект`,
        "initialCode": `
    const arr = [{name: ‘width’, value: 10}, {name: ‘height’, value: 20}]
    
    const result  = { width: 10, height: 20 }
    
    `,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
    {
        "description": `Функция сравнения версии продукта `,
        "initialCode": `
            
            versionComp(“1.0.0”,”2.0.0”) /// 1.0.0 < 2.0.0
            versionComp(“1.0.0”,”1.0.0”) /// 1.0.0 = 1.0.0
            versionComp(“1.0”,”1.0.0”) /// 1.0 = 1.0.0
            versionComp(“1.2.1”,”1.2.0”) /// 1.2.1 > 1.2.0
            versionComp(“1.2.1”,”1.2.1.99”) /// 1.2.1 < 1.2.1.99
    
    `,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
    {
        "description": `Даны 3 асинхронные функции со случайным setTimeout нужно сделать код который выведет в консоль ABC `,
        "initialCode": `
                function foo(callback) {
                setTimeout(function(){
                callback(‘A’)
                }, Math.random() * 100)
                }
                
                function bar(callback) {
                setTimeout(function(){
                callback(‘B’)
                }, Math.random())
                }
                
                function bazz(callback) {
                    setTimeout(function(){
                    callback(‘C’)
                    }, Math.random() * 100)
                  }

    
    `,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
    {
        "description": `Необходимо написать функцию которая будет проверять соответствие скобок разных типов `,
        "initialCode": `
            isCorrectBrackets(“[{}]”)  // true 
            isCorrectBrackets(“[({})]”) // true
            isCorrectBrackets(“Hello [({})] World!”) // true
            isCorrectBrackets(“[{(})]”) // false
            isCorrectBrackets(“[”) // false
            isCorrectBrackets() // false
        `,
        "refs": ["https://leetcode.com/problems/valid-parentheses/"],
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
    {
        "description": `Надо поставить картинку по центру 
После по наведению увеличить картнку в 2 раза анимированно`,
        "initialCode": `
              <html>
                <body>
                    <img /> 
                </body>
            </html>

        `,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },

    {
        "description": `Проверка связи между сотрудником и его начальником в Иерархии.
         
                     Belle  
                /       |
         Grant         Loren 
            | 
         Emma 
         
         Пример иерархити 
         
         то есть надо понять что У Emma два менеджера Belle и Grant но у Loren только один менеджер 
         
         Задача наростить сеть до CONNECTIONS_CNT
         
         Менеджеры уже будут созданы 
         
         
         `,
        "initialCode": `
           const MANAGERS_CNT = 5;
           const CONNECTIONS_CNT = 20;
           const managers = new Array(MANAGERS_CNT).fill(null).map(() => 'asdfasd' + Math.ceil(Math.random() * 1000));
            
            function rnDf(arr) {
                return arr(Math.flor(Math.random() + arr.length));
            }
            
            function queryConnection() {
            
                const SUCCESS_FACTOR = 0.5;
                
                return new Promise((resolve, reject) => {
                    if(Math.random() < SUCCESS_FACTOR){
                        resolve({
                            manger: rnDf(managers),
                            worker: 'wer' + Math.ceil(Math.random() * 1000)
                        })
                    }else{
                        reject(null);
                    }
                })
                
                
            }


        `,
        "type": [TYPES.JS_SYNTAX, TYPES.ALGORITHM]
    },
]