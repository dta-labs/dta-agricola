// Mini framework de pruebas (sin dependencias externas).
// Uso:
//   TEST_CASE(nombre_de_la_prueba) { CHECK(condicion); CHECK_EQ(a, b); }
#pragma once
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>
#include <sstream>

namespace minitest {

struct TestCase { const char* name; const char* file; void (*fn)(); };

inline std::vector<TestCase>& registry() { static std::vector<TestCase> r; return r; }
inline int& failures() { static int f = 0; return f; }

struct Registrar {
  Registrar(const char* name, const char* file, void (*fn)()) { registry().push_back({name, file, fn}); }
};

template <class T> std::string str(const T& v) { std::ostringstream o; o << v; return o.str(); }
inline std::string str(const char* v) { return v ? std::string("\"") + v + "\"" : "null"; }
inline std::string str(char* v) { return str((const char*) v); }
inline std::string str(const std::string& v) { return "\"" + v + "\""; }
inline std::string str(bool v) { return v ? "true" : "false"; }
inline std::string str(unsigned char v) { return std::to_string((int) v); }

inline void fail(const char* file, int line, const std::string& msg) {
  failures()++;
  std::printf("      ✘ %s:%d  %s\n", file, line, msg.c_str());
}

template <class A, class B> bool equal(const A& a, const B& b) { return a == b; }
inline bool equal(const char* a, const char* b) { return std::strcmp(a, b) == 0; }
inline bool equal(char* a, const char* b) { return std::strcmp(a, b) == 0; }
inline bool equal(const std::string& a, const char* b) { return a == b; }

inline int runAll(const char* filter = nullptr) {
  int failedTests = 0, run = 0;
  const char* lastFile = "";
  for (auto& t : registry()) {
    if (filter && !std::strstr(t.name, filter)) continue;
    if (std::strcmp(lastFile, t.file) != 0) { std::printf("\n[%s]\n", t.file); lastFile = t.file; }
    int before = failures();
    t.fn();
    run++;
    bool ok = failures() == before;
    if (!ok) failedTests++;
    std::printf("  %s %s\n", ok ? "✔" : "✘", t.name);
  }
  std::printf("\n%d pruebas, %d correctas, %d con fallas\n", run, run - failedTests, failedTests);
  return failedTests ? 1 : 0;
}

}  // namespace minitest

#define MT_CAT2(a, b) a##b
#define MT_CAT(a, b) MT_CAT2(a, b)
#define TEST_CASE(name)                                                        \
  static void name();                                                          \
  static minitest::Registrar MT_CAT(mt_reg_, name)(#name, __FILE__, name);     \
  static void name()

#define CHECK(cond)                                                            \
  do { if (!(cond)) minitest::fail(__FILE__, __LINE__, "CHECK(" #cond ")"); } while (0)

#define CHECK_EQ(a, b)                                                         \
  do {                                                                         \
    auto _va = (a); auto _vb = (b);                                            \
    if (!minitest::equal(_va, _vb))                                            \
      minitest::fail(__FILE__, __LINE__, "CHECK_EQ(" #a ", " #b "): " +        \
                     minitest::str(_va) + " != " + minitest::str(_vb));        \
  } while (0)

#define CHECK_NEAR(a, b, tol)                                                  \
  do {                                                                         \
    double _va = (a), _vb = (b);                                               \
    if (_va - _vb > (tol) || _vb - _va > (tol))                                \
      minitest::fail(__FILE__, __LINE__, "CHECK_NEAR(" #a ", " #b "): " +      \
                     minitest::str(_va) + " vs " + minitest::str(_vb));        \
  } while (0)
