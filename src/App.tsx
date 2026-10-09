import Header from "@/components/Header"
import Main from "@/components/Main"
import useUIStore from "@/store/uiStore";
import { useEffect } from "react";
import { applyTheme } from "@/store/uiStore";
import Docs from "./components/Docs";
import SharedDocument from "./components/SharedDocument";

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
  
  // paper is white: print in the light theme whatever is on screen
  useEffect(() => {
    const before = () => applyTheme('light');
    const after = () => applyTheme(useUIStore.getState().theme);

    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg text-text">
      <Header />
      <Docs />
      <Main /> 
      <SharedDocument />
    </div>
  )
}

export default App