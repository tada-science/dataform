package(default_visibility = ["//visibility:public"])

load("@npm_bazel_typescript//:index.bzl", "ts_library")

ts_library(
    name = "singerjs",
    srcs = glob(["**/*.ts"]),
    module_name = "@dataform/singerjs",
    deps = [
        "@npm//@types/node",
        "@npm//@types/fs-extra",
        "@npm//fs-extra",
        "@npm//simple-git",
    ],
)
