import useUIStore from "@/store/uiStore";
import Editor from "@/components/Editor"
import Preview from "./Preview";

export default function Main() {

  const tab = useUIStore(state => state.tab);


  return (
    <main className="flex flex-1 overflow-hidden">

        {tab !== 'preview' && <Editor/>}

        {tab !== 'editor' && <Preview/>}
      </main>
  )
}
