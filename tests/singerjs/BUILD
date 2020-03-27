load("//testing:index.bzl", "ts_test_suite")

ts_test_suite(
    name = "tests",
    srcs = glob(["**/*.ts"]),
    data = [],
    deps = [
        "//singerjs",
        "//testing",
        "//tests/utils",
        "@npm//@types/chai",
        "@npm//@types/long",
        "@npm//@types/node",
        "@npm//@types/stack-trace",
        "@npm//@types/fs-extra",
        "@npm//fs-extra",
        "@npm//chai",
        "@npm//stack-trace",
    ],
)
