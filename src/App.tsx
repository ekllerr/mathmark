import Header from "@/components/Header"
import Main from "@/components/Main"
import useUIStore from "@/store/uiStore";
import { useEffect } from "react";
import Docs from "./components/Docs";

function App() {

  const tab = useUIStore(state => state.tab);
  const setTab = useUIStore(state => state.setTab);

  const toggleDocs = useUIStore(state => state.toggleDocs);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && tab === 'split')
        setTab('preview');
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab, setTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if(e.ctrlKey && e.key === '/'){
        e.preventDefault();
        toggleDocs();
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleDocs]);
  
  return (
    <div className="flex flex-col h-screen bg-bg text-text">
      <Header />
      <Docs />
      <Main /> 
    </div>
  )
}

export default App