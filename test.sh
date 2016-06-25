#!/usr/bin/env bash
set -e

function must_find {
    NAME=$1
    FLAGS=$2
    STR=$3
    DESC=$4
    
    echo "- test $DESC"
    RESULT=$(node cli.js $FLAGS tests/$NAME.js)
    if ! echo "$RESULT" | grep -q "$STR"
    then
        echo "$RESULT"
        echo "FAIL: expected '$STR' in output"
        exit 1
    fi
}
function must_omit {
    NAME=$1
    FLAGS=$2
    STR=$3
    DESC=$4
    
    echo "- test $DESC"
    RESULT=$(node cli.js $FLAGS tests/$NAME.js)
    if echo "$RESULT" | grep --color=always "$STR"
    then
        echo "FAIL: found '$STR' in output"
        exit 1
    fi
}

must_omit "unreachable" "" "unreachable()" "strip unreachable code"
must_find "production" "" "debug()" "'-p' off by default"
must_omit "production" "-p" "debug()" "-p mode"
must_omit "production" "--production" "debug()" "--production mode"
must_omit "recursive" "" "unreachable()" "recursive logic"
must_omit "useless" "" "1337" "remove useless statements"
must_omit "comments" "" "strip" "remove comments"
must_find "comments" "" "license" "keep @license comments"
must_find "comments" "" "preserve" "keep @preserve comments"
must_omit "anon-func" "" "function" "convert anon funcs to =>"
must_find "anon-func-this" "" "function" "keep functions that reference 'this'"
