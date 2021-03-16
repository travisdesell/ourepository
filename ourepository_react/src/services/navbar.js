import emitter from "./emitter"

class NavbarService {

    setHeading(heading){
        console.log("Sure");
        emitter.emit("updateHeading",heading)
    }

    setToolbar(tools){
        console.log("Sure");
        emitter.emit("updateToolbar",tools)
    }
}

const navbarService = new NavbarService()

export default navbarService 

 