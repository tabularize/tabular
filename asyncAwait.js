
function sample(){
    return new Promise(resolve => {
       setTimeout(() => {
           resolve('resolve');
       },2000);
    });
}

async function asyncCall() {
    console.log("Called Async");
    let result = await sample();
    console.log(result);

    // sample()
    //     .then((res) => {

    //     })
    //     .catch((err) => {

    //     })
}

asyncCall();
console.log("i'm not waiting!!");
