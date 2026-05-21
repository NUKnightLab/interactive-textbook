# Chapter 4
# Loads the iris dataset, computes summary statistics

library(dplyr)
library(ggplot2)
library(readr)

iris <- read_csv("/home/student/datasets/iris.csv")

# summary statistics by species
summary_stats <- iris %>%
  group_by(species) %>%
  summarise(
    avg_sepal_length = mean(sepal_length),
    avg_petal_length = mean(petal_length),
    n = n()
  )

print(summary_stats)

# scatter plot of petal length vs petal width, colored by species
plot <- ggplot(iris, aes(x = petal_length, y = petal_width, color = species)) +
  geom_point(size = 2, alpha = 0.7) +
  labs(
    title = "Iris: petal length vs petal width",
    x = "Petal length (cm)",
    y = "Petal width (cm)"
  ) +
  theme_minimal()

ggsave("/home/student/student_work/iris_plot.png", plot, width = 6, height = 4)
cat("\nPlot saved to student_work/iris_plot.png\n")
