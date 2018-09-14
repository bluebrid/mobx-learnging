import { observable, autorun } from './.build.es6/mobx'
const addBtn = document.getElementById('add')
const minusBtn = document.getElementById('minus')
const incomeLabel = document.getElementById('incomeLabel')
const nameInput = document.getElementById('name');
const bankUser = observable({
    name: 'Ivan Fan',
    income: 3,
    debit: 2
});

const incomeDisposer = autorun((reaction) => {
    incomeLabel.innerText = `${bankUser.name} income is ${bankUser.income}`
}, {
    name: 'autorun000001'
})
// incomeDisposer();
autorun(() => {
    console.log('账户存款:', bankUser.income);
}, {
    name: 'autorun000002'
});
autorun(() => {
    console.log('账户名称:', bankUser.name);
}, {
    name: 'autorun000003'
});
var nameDisposer = autorun(() => {
    console.log("name:" + bankUser.name)
}, {
    name: 'autorun000004'
});
addBtn.addEventListener('click', () => {
    bankUser.income++
})
minusBtn.addEventListener('click', () => {
    bankUser.income--
})
nameInput.addEventListener('change', (e) => {
    bankUser.name= e.target.value;
})