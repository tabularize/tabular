
function mergeSort(a, l, r){
    if(l<r){
        let m = l + parseInt((r-l)/2);
        a = mergeSort(a, l, m);
        a = mergeSort(a, m+1, r);
        a = merge(a, l, m, r);
    }
    return a;
}

function merge(a, l, m, r){
    let pa = l, pb = m+1, i = 0;
    let temp = [];

    while(pa < m+1 && pb < r+1){
        if(a[pa] <= a[pb]){
            temp[i] = a[pa];
            pa++;
        } else {
            temp[i] = a[pb];
            pb++;
        }
        i++;
    }
    while(pa < m+1){
        temp[i] = a[pa];
        i++;
        pa++;
    }
    while(pb < r+1){
        temp[i] = a[pb];
        i++;
        pb++;
    }

    let k = l;
    for(let e of temp){
        a[k] = e;
        k++;
    }

    return a;
}

function main() {
    let a = [4,2,1,7,3];
    let r = a.length - 1;
    mergeSort(a, 0, r);

    console.log(a);
}

main();