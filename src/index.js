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
})
// incomeDisposer();
autorun(() => {
    console.log('账户存款:', bankUser.income);
});
autorun(() => {
    console.log('账户名称:', bankUser.name);
});
var nameDisposer = autorun(() => {
    console.log("name:" + bankUser.name)
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