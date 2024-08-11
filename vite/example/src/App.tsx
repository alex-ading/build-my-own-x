import img from '../public/duck.jpg'

function App(props: any) {
  return (
    <>
      <p>{props.name ? props.name : null}</p>
      <p>app</p>
      <img src={img} alt="" />
    </>
  )
}

export default App