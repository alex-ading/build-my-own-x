import _React from './_react';
import './index.css'

// 函数组件
const handleClickTitle = (name) => {
  console.log(`handle Click Title ${name}`)
}

// comment like this one, when babel transpile the JSX it will use the function we define.
/** @jsx _React.createElement */
function App(props) {
  return <h1 onClick={() => handleClickTitle(props.name)}>Hi {props.name}</h1>
}
const element = <App name="alex" />
const container = document.getElementById("root");
_React.render(element, container)


// 普通组件
// const handleClickTitle = () => {
//   console.log('handle Click Title')
// }

// const element = (
//   <div className="ele">
//     <h1 className="title" onClick={handleClickTitle}>标题</h1>
//     <p>内容</p>
//   </div>
// );
// const container = document.getElementById("root");
// _React.render(element, container)