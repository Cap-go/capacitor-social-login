//
//  Goto.swift
//  Pods
//
//  Created by WcaleNieWolny on 05/10/2024.
//  Based on https://harlanhaskins.com/2016/01/09/goto-in-swift.html

struct Goto {
    typealias Closure = () -> Void
    var closures = [String: Closure]()
    mutating func set(label: String, closure: @escaping Closure) {
        closures[label] = closure
    }
    func call(label: String) {
        closures[label]?()
    }
}
