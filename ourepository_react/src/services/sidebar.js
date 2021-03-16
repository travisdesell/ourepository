import emitter from "./emitter"

class SidebarService {

    setHeader(header){
        console.log("Sure");
        emitter.emit("updateHeader",header)
    }

    setContent(tools){
        console.log("Sure");
        emitter.emit("updateContent",tools)
    }
}

const sidebarService = new SidebarService()

export default sidebarService 

 