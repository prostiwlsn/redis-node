class SortedSet{
    constructor(){
        this.values = []
    }

    addElement(key, value){
        if(this.values.filter(value => value.key == key).length != 0){
            this.values = this.values.filter(value => value.key != key)
        }
        this.values.push({key, value})

        this.values.sort((a, b) => parseInt(a.value) - parseInt(b.value))
    }

    rangeElements(start, end){
        let returnValues = []

        for(let i = start; i < end; i ++){
            returnValues.push(this.values[i].key)
            returnValues.push(this.values[i].value)
        }
        return returnValues
    }

    getScore(key){
        console.log(this.values, this.values.filter(value => value.key == key))
        return this.values.filter(value => value.key == key)[0].value
    }
}

module.exports = {
    SortedSet
}