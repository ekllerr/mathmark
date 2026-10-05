import useUIStore from "@/store/uiStore";
import useEditorStore from "@/store/editor";
import Editor from "@/components/Editor"
import Preview from "./Preview";
import Sidebar from "./Sidebar";

export default function Main() {

  const tab = useUIStore(state => state.tab);
  const sidebarOpen = useUIStore(state => state.sidebarOpen);
  const currentId = useEditorStore(state => state.currentId);

  return (
    <main className="relative flex flex-1 overflow-hidden">

        {sidebarOpen && <Sidebar/>}

        {/* both are keyed by document: undo history, open results and plot positions belong to one document */}
        {tab !== 'preview' && <Editor key={`editor-${currentId}`}/>}

        {tab !== 'editor' && <Preview key={currentId}/>}
      </main>
  )
}
