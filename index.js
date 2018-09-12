
const addBtn = document.getElementById('add')
const minusBtn = document.getElementById('minus')
const incomeLabel = document.getElementById('incomeLabel')
const bankUser = mobx.observable({
    name: 'Ivan Fan',
    income: 3,
    debit: 2
});

const incomeDisposer = mobx.autorun(() => {
    if (bankUser.income < 0) {
        bankUser.income = 0
        throw new Error('throw new error')
    } 
    incomeLabel.innerText = `Ivan Fan income is ${bankUser.income}`   
}, {
    name: 'income',
    delay: 2*1000,
    onError: (e) => {
        console.log(e)
    }
})

addBtn.addEventListener('click', ()=> {
    bankUser.income ++
})
minusBtn.addEventListener('click', () => {
    bankUser.income --
})




// var incomeDisposer = mobx.autorun(() => {
//     console.log('张三的aaaaa账户存款:', bankUser.name);
//     //console.log("name:" + bankUser.name)
// });
// var incomeDisposer = mobx.autorun(() => {
//     console.log('张三的账ddddd户存款:', bankUser.income);
//     //console.log("name:" + bankUser.name)
// });
// var nameDisposer = mobx.autorun(() => {
//     console.log("name:" + bankUser.name)
// });
// nameDisposer();
// debugger