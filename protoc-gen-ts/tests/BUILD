load("@rules_proto//proto:defs.bzl", "proto_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")

proto_library(
    name = "testprotos_proto",
    srcs = ["test1.proto"],
    visibility = ["//visibility:public"],
)

load("//tools:ts_proto_library.bzl", protobufjs_proto_library = "ts_proto_library")

protobufjs_proto_library(
    name = "protobufjs_testprotos_ts_proto",
    deps = [
        ":testprotos_proto",
    ],
)

load("//protoc-gen-ts:ts_proto_library.bzl", "ts_proto_library")

ts_proto_library(
    name = "testprotos_ts_proto",
    protos = [
        ":testprotos_proto",
    ],
    deps = [
        "@npm//@types/long",
    ],
)

load("//testing:index.bzl", "ts_test_suite")

ts_test_suite(
    name = "tests",
    srcs = glob(["*.spec.ts"]),
    data = [
        "//protoc-gen-ts/tests/reserializer",
    ],
    templated_args = ["--reserializer-location=$(location //protoc-gen-ts/tests/reserializer)"],
    deps = [
        ":protobufjs_testprotos_ts_proto",
        ":testprotos_ts_proto",
        "//common/flags",
        "//testing",
        "@npm//@types/chai",
        "@npm//@types/long",
        "@npm//@types/node",
        "@npm//chai",
    ],
)

go_proto_library(
    name = "testprotos_go_proto",
    importpath = "github.com/dataform-co/dataform/protoc-gen-ts/tests",
    proto = ":testprotos_proto",
    visibility = ["//visibility:public"],
)
