
for (var a in [1,2,3]) {
    if (true) break
    unreachable()
}
while (true) {
    continue
    unreachable()
}
function hi() {
    throw 'fit'
    unreachable()
}

function bob() {
    
    return 5
    
    unreachable()
}

function complex() {

    if (3+4> ("foo"=="foo"?5:9)) {
        if (false) {
            return
        }
        foo()
        return
    }
    
    unreachable()
}
