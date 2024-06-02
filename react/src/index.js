import _React from './_react';
import './index.css'

// comment like this one, when babel transpiles the JSX it will use the function we define.
/** @jsx _React.createElement */

const handleClickTitle = () => { 
    console.log('handle Click Title')
}

const element = (
    <div className="ele">
      <h1 className="title" onClick={ handleClickTitle }>标题</h1>
      <p>内容</p>
    </div>
  );
  const container = document.getElementById("root");
  _React.render(element, container)