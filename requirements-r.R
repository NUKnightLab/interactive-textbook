# R packages baked into the course image.
# jsonlite + languageserver are required by the VSCode extension

# notes: binaries are pre-compiled software ready to run, R defaults to source on Linux, even when binaries are available, because of historical reasons
# Posit P3M hosts Linux binaries for CRAN packages but only serves them when the request's User Agent identifies the platform AND the request asks for type = "binary"
options(HTTPUserAgent = sprintf(
  "R/%s R (%s)",
  getRversion(),
  paste(getRversion(), R.version$platform, R.version$arch, R.version$os)
))

install.packages(
  c(
    "ggplot2",
    "dplyr",
    "readr",
    "jsonlite",
    "languageserver"
  ),
  repos = "https://packagemanager.posit.co/cran/__linux__/bookworm/latest"
)
