from langchain_community.tools import DuckDuckGoSearchResults

def get_search_tool():
    """
    Free web search tool that allows agents (especially the Researcher) to pull real-time data from the internet.
    DuckDuckGo is used for market research.
    """
    # max_results: Retrieves the summary content of the top 3 web pages from the web for each query
    search_tool = DuckDuckGoSearchResults(max_results=3)
    return [search_tool]
