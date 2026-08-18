function toggleInfo(element){

    let info = element.nextElementSibling;

    if(info.style.display === "block"){
        info.style.display = "none";
    }
    else{
        info.style.display = "block";
    }
}