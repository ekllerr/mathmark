import Header from "@/components/Header"
import Main from "@/components/Main"
import useUIStore from "@/store/uiStore";
import { useEffect } from "react";

function App() {

  const tab = useUIStore(state => state.tab);
  const setTab = useUIStore(state => state.setTab);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && tab === 'split')
        setTab('preview');
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab, setTab]);
  
  return (
    <div className="flex flex-col h-screen bg-bg text-text">
      <Header />
      <Main /> 
    </div>
  )
}

export default App