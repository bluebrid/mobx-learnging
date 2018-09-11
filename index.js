
const addBtn = document.getElementById('add');
const minusBtn = document.getElementById('minus');
const incomeLabel = document.getElementById('incomeLabel');
const bankUser = mobx.observable({
    name: 'Ivan Fan',
    income: 3,
    debit: 2
});

const incomeDisposer = mobx.autorun(() => {
    incomeLabel.innerText = `Ivan Fan income is ${bankUser.income}`
});

addBtn.addEventListener('click', ()=> {
    bankUser.income ++;
})
minusBtn.addEventListener('click', () => {
    bankUser.income --;
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